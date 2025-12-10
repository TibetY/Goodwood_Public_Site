import { Container, Typography, Box, Paper, Grid, Divider } from '@mui/material';

interface PastMaster {
    name: string;
    years: string;
}

const pastMasters: PastMaster[] = [
    // 1863-1899
    { name: 'W.Bro. Rev. Charles B. Pettit', years: '1863 – 1864' },
    { name: 'W.Bro. Rev. Charles B. Pettit', years: '1864 – 1865' },
    { name: 'W. Bro. George Keating', years: '1865 – 1866' },
    { name: 'W. Bro. Edward Reilly', years: '1866 – 1867' },
    { name: 'W. Bro. Dr. Daniel Beatty', years: '1867 – 1868' },
    { name: 'W. Bro. Rev. Charles B. Pettit', years: '1868 – 1869' },
    { name: 'W. Bro. Dr. Daniel Beatty', years: '1869 – 1870' },
    { name: 'W. Bro. Henry McDougall', years: '1870 – 1871' },
    { name: 'W. Bro. Thomas V. Lion', years: '1871 – 1872' },
    { name: 'W. Bro. Duncan McDougall', years: '1872 – 1873' },
    { name: 'W. Bro. J. McLaren', years: '1873 – 1874' },
    { name: 'W. Bro. Dr. Daniel Beatty', years: '1874 – 1875' },
    { name: 'W. Bro. Hugh Reilly', years: '1875 – 1876' },
    { name: 'W.Bro. Albert Bradley', years: '1876 – 1877' },
    { name: 'W. Bro. John Satchell', years: '1877 – 1878' },
    { name: 'W. Bro. John Satchell', years: '1878 – 1879' },
    { name: 'W. Bro. T. W. Hill', years: '1879 – 1880' },
    { name: 'W. Bro. John Satchell', years: '1880 – 1881' },
    { name: 'W. Bro. John Satchell', years: '1881 – 1882' },
    { name: 'W. Bro. John Satchell', years: '1882 – 1883' },
    { name: 'W. Bro. John Satchell', years: '1883 – 1884' },
    { name: 'W. Bro. John Satchell', years: '1884 – 1885' },
    { name: 'W. Bro. John Satchell', years: '1885 – 1886' },
    { name: 'W. Bro. John Satchell', years: '1886 – 1887' },
    { name: 'W. Bro. John Satchell', years: '1887 – 1888' },
    { name: 'W. Bro. Robert Hill', years: '1888 – 1889' },
    { name: 'W. Bro. R. McCaffery', years: '1889 – 1890' },
    { name: 'W. Bro. James McElroy', years: '1890 – 1891' },
    { name: 'W. Bro. L. P. Manhard', years: '1891 – 1892' },
    { name: 'W. Bro. Dr. C.J. Richardson', years: '1892 – 1893' },
    { name: 'W. Bro. Dr. Jamieson', years: '1893 – 1894' },
    { name: 'W. Bro. Dr. Bell', years: '1894 – 1895' },
    { name: 'W. Bro. Robert H. Grant', years: '1895 – 1896' },
    { name: 'W. Bro. Robert H. Grant', years: '1896 – 1897' },
    { name: 'W. Bro. Clark Craig', years: '1897 – 1898' },
    { name: 'W. Bro. Dr. A. F. McCordrick', years: '1898 – 1899' },
    { name: 'W. Bro. J. H. Cryderman', years: '1899 – 1900' },

    // 1900-1999
    { name: 'W. Bro. F. H. Pratt', years: '1900 – 1901' },
    { name: 'W. Bro. F. H. Pratt', years: '1901 – 1902' },
    { name: 'W. Bro. Dr. R.C. Channonhouse', years: '1902 – 1903' },
    { name: 'W. Bro. Dr. J.J. Danby', years: '1903 – 1904' },
    { name: 'W. Bro. Charles Saddington', years: '1904 – 1905' },
    { name: 'W. Bro. Robert Richardson', years: '1905 – 1906' },
    { name: 'W. Bro. Henry Hutton', years: '1906 – 1907' },
    { name: 'W. Bro. Harry L. Langdon', years: '1907 – 1908' },
    { name: 'W. Bro. Cummings', years: '1908 – 1909' },
    { name: 'W. Bro. Dr. S.W. Bradley', years: '1909 – 1910' },
    { name: 'W. Bro. H.S. Mann', years: '1910 – 1911' },
    { name: 'W. Bro. Dr. J. J. Danby', years: '1911 – 1912' },
    { name: 'W. Bro. W. G. Beddoe', years: '1912 – 1913' },
    { name: 'W. Bro. W. G. Beddoe', years: '1913 – 1914' },
    { name: 'W. Bro. Rev. T. J. Vickery', years: '1914 – 1915' },
    { name: 'W. Bro. Samuel B. Gordon', years: '1915 – 1916' },
    { name: 'W. Bro. B. H. Connely', years: '1916 – 1917' },
    { name: 'W. Bro. John Kemphill', years: '1917 – 1918' },
    { name: 'W. Bro. John Kemphill', years: '1918 – 1919' },
    { name: 'W. Bro. A. Phillips', years: '1919 – 1920' },
    { name: 'W. Bro. J. R. Mills', years: '1920 – 1921' },
    { name: 'W. Bro. W. J. Anderson', years: '1921 – 1922' },
    { name: 'W. Bro. L. W. Nixon', years: '1922 – 1923' },
    { name: 'W. Bro. A. L. Tubman', years: '1923 – 1924' },
    { name: 'W. Bro. A. L. Tubman', years: '1924 – 1925' },
    { name: 'W. Bro. J. Edgar Gamble', years: '1925 – 1926' },
    { name: 'W. Bro. D. A. Brownlee', years: '1926 – 1927' },
    { name: 'W. Bro. F. F. Kemp', years: '1927 – 1928' },
    { name: 'W. Bro. F. F. Kemp', years: '1928 – 1929' },
    { name: 'W. Bro. J. P. Morton', years: '1929 – 1930' },
    { name: 'W. Bro. W. C. Mills', years: '1930 – 1931' },
    { name: 'W. Bro. E. S. McLaren', years: '1931 – 1932' },
    { name: 'W. Bro. George G. Argue', years: '1932 – 1933' },
    { name: 'W. Bro. Edward J. Good', years: '1933 – 1934' },
    { name: 'W. Bro. F. H. McCaffery', years: '1934 – 1935' },
    { name: 'W. Bro. F. H. McCaffery', years: '1935 – 1936' },
    { name: 'W. Bro. Collis B. Lewis', years: '1936 – 1937' },
    { name: 'W. Bro. J. P. McAffery', years: '1937 – 1938' },
    { name: 'W. Bro. J. H. Channonhouse', years: '1938 – 1939' },
    { name: 'W. Bro. Rev. J. J. Bannell', years: '1939 – 1940' },
    { name: 'W. Bro. Leonard H. Brown', years: '1940 – 1941' },
    { name: 'W. Bro. J. H. Featherstone', years: '1941 – 1942' },
    { name: 'W. Bro. Collis B. Lewis', years: '1942 – 1943' },
    { name: 'W. Bro. Ken E. Hicks', years: '1943 – 1944' },
    { name: 'W. Bro. R. Borden MacKey', years: '1944 – 1945' },
    { name: 'W. Bro. T. A. Brown', years: '1945 – 1946' },
    { name: 'W. Bro. George G. Argue', years: '1946 – 1947' },
    { name: 'W. Bro. William C. Dunbar', years: '1947 – 1948' },
    { name: 'W. Bro. M. G. Paynter', years: '1948 – 1949' },
    { name: 'W. Bro. M. G. Paynter', years: '1949 – 1950' },
    { name: 'W. Bro. W. Elwin Vaughan', years: '1950 – 1951' },
    { name: 'W. Bro. John Scollan', years: '1951 – 1952' },
    { name: 'W. Bro. Everett Seabrooke', years: '1952 – 1953' },
    { name: 'W. Bro. Henry Cassidy', years: '1953 – 1954' },
    { name: 'W. Bro. Robert Neill', years: '1954 – 1955' },
    { name: 'W. Bro. John A. Foster', years: '1955 – 1956' },
    { name: 'W. Bro. J. Arnold Smith', years: '1956 – 1957' },
    { name: 'W. Bro. James Gilpin', years: '1957 – 1958' },
    { name: 'W. Bro. Rev. E.B. Bugden', years: '1958 – 1959' },
    { name: 'W. Bro. Kenneth Beaton', years: '1959 – 1960' },
    { name: 'W. Bro. A McWade', years: '1960 – 1961' },
    { name: 'W. Bro. Brue Wilson', years: '1961 – 1962' },
    { name: 'W. Bro. Lorne Brown', years: '1962 – 1963' },
    { name: 'W. Bro. Herbert Lyte', years: '1963 – 1964' },
    { name: 'W. Bro. Lorne Wilson', years: '1964 – 1965' },
    { name: 'W. Bro. Gordon Hill', years: '1965 – 1966' },
    { name: 'W. Bro. Alfred Harrington', years: '1966 – 1967' },
    { name: 'W. Bro. Kenneth McCurdy', years: '1967 – 1968' },
    { name: 'W. Bro. Preston Dell', years: '1968 – 1969' },
    { name: 'W. Bro. Hilliard Ebbs', years: '1969 – 1970' },
    { name: 'W. Bro. William Craig', years: '1970 – 1971' },
    { name: 'W. Bro. Ear Milne', years: '1971 – 1972' },
    { name: 'W. Bro. George McCallum', years: '1972 – 1973' },
    { name: 'W. Bro. William Cook', years: '1973 – 1974' },
    { name: 'W. Bro. Ebert Cassidy', years: '1974 – 1975' },
    { name: 'W. Bro. John Young', years: '1975 – 1976' },
    { name: 'W. Bro. Russell Neill', years: '1976 – 1977' },
    { name: 'V.W. Bro. Joseph Stirling', years: '1977 – 1978' },
    { name: 'W. Bro. Joseph Marshall', years: '1978 – 1979' },
    { name: 'W. Bro. Robert Abbott', years: '1979 – 1980' },
    { name: 'W. Bro. Roy Hyuland', years: '1980 – 1981' },
    { name: 'W. Bro. Merrill Horricks', years: '1981 – 1982' },
    { name: 'W. Bro. Gordon Crowe', years: '1982 – 1983' },
    { name: 'W. Bro. Bruce Moffitt', years: '1983 – 1984' },
    { name: 'W. Bro. Rodney MacGibbon', years: '1984 – 1985' },
    { name: 'W. Bro. Bernard McMullen', years: '1985 – 1986' },
    { name: 'W. Bro. Arthur Gosling', years: '1986 – 1987' },
    { name: 'W. Bro. Lewis Barker', years: '1987 – 1988' },
    { name: 'W. Bro. Gerald Cassidy', years: '1988 – 1989' },
    { name: 'W. Bro. Stephen Green', years: '1989 – 1990' },
    { name: 'W. Bro. Edward Burton', years: '1990 – 1991' },
    { name: 'R.W. Bro. William Cook', years: '1991 – 1992' },
    { name: 'W. Bro. Bruce Moffitt', years: '1992 – 1993' },
    { name: 'V. W. Bro. Joseph Stirling', years: '1993 – 1994' },
    { name: 'W. Bro. Trevor Shogilev', years: '1994 – 1995' },
    { name: 'W. Bro. Trevor Shogilev', years: '1996 – 1996' },
    { name: 'V.W. Bro. Milton Summers', years: '1996 – 1997' },
    { name: 'R. W. Donald Healey', years: '1997 – 1998' },
    { name: 'W. Bro. William Perry', years: '1998 – 1999' },
    { name: 'W. Bro. Ken Tuckwood', years: '1999 – 2000' },

    // 2000-2024
    { name: 'W. Bro. Ian Gregory', years: '2000 – 2001' },
    { name: 'W. Bro. Henry Harrison', years: '2001 – 2002' },
    { name: 'W. Bro. Roy Hyland', years: '2002 – 2003' },
    { name: 'W. Bro. Ken Tuckwood', years: '2003 – 2004' },
    { name: 'W.Bro. Henry Harrison', years: '2004 – 2005' },
    { name: 'R.W. Donald Healey', years: '2005 – 2006' },
    { name: 'W.W.Bro. Robert Ledingham', years: '2006 – 2007' },
    { name: 'W. Bro. Micheal MacGregor', years: '2007 – 2008' },
    { name: 'W. Bro. Christopher Hogg', years: '2008 – 2009' },
    { name: 'W.Bro. Roger Cook', years: '2009 – 2010' },
    { name: 'W. Bro. Peter Rourke', years: '2010 – 2011' },
    { name: 'W. Bro. Peter Rourke', years: '2011 – 2012' },
    { name: 'W. Bro. Kevin Zeigler', years: '2012 – 2013' },
    { name: 'W. Bro. Paul Hulford', years: '2013 – 2014' },
    { name: 'W. Bro. S. D. Howie', years: '2014 – 2015' },
    { name: 'W. Bro. Dave Butler', years: '2015 - 2016' },
    { name: 'W. Bro Ken Burchill', years: '2016 - 2017' },
    { name: 'V.W. Bro Ken Burchill', years: '2017 - 2018' },
    { name: 'W. Bro. Greg Skelly', years: '2018 - 2019' },
    { name: 'W. Bro. Marc Lavoie', years: '2019 - 2022' },
    { name: 'W. Bro. Jordan McConnell', years: '2022-2024' },
    { name: 'W. Bro. Jim McConnell', years: '2024-2024' },
    { name: 'W. Bro. Joe Burchill', years: '2025-2026' }
];

export default function PastMasters() {
    // Group by century and reverse the arrays
    const century1800s = pastMasters.filter(pm => pm.years.startsWith('18')).reverse();
    const century1900s = pastMasters.filter(pm => pm.years.startsWith('19')).reverse();
    const century2000s = pastMasters.filter(pm => pm.years.startsWith('20')).reverse();

    const PastMastersList = ({ masters }: { masters: PastMaster[] }) => (
        <Grid container spacing={2}>
            {masters.map((master, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Paper
                        elevation={1}
                        sx={{
                            p: 2,
                        }}
                    >
                        <Typography variant="body1" fontWeight="medium">
                            {master.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {master.years}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                Past Masters
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph textAlign="center" sx={{ mb: 6 }}>
                Honoring the Worshipful Masters who have led Goodwood Lodge since 1863
            </Typography>

            {/* 2000s */}
            <Box>
                <Typography variant="h4" component="h2" gutterBottom color="primary" sx={{ mb: 3 }}>
                    Present - 2000
                </Typography>
                <PastMastersList masters={century2000s} />
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* 1900s */}
            <Box sx={{ mb: 6 }}>
                <Typography variant="h4" component="h2" gutterBottom color="primary" sx={{ mb: 3 }}>
                    1999 – 1900
                </Typography>
                <PastMastersList masters={century1900s} />
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* 1800s */}
            <Box sx={{ mb: 6 }}>
                <Typography variant="h4" component="h2" gutterBottom color="primary" sx={{ mb: 3 }}>
                    1899 – 1863
                </Typography>
                <PastMastersList masters={century1800s} />
            </Box>
        </Container>
    );
}